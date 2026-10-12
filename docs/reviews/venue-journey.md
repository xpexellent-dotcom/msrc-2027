# Venue journey — ENG-030, 12 October 2026

Mode: Experience with practical arrival information. This is a separate review
PR requested by the organizer, not authorization to merge or publish this new
page. Inherit the published MSRC purple/champagne/ivory world and EN/AR metrics.
The user pins the composition: four tinted venue photos, then a full-screen
scroll journey from airport through Jeddah to the conference venue. No concept
tournament or unrelated site redesign is needed; the supplied composition and
earlier delegated creative freedom settle the direction.

## Audit and priorities

| Before | After | Why |
| --- | --- | --- |
| Generic two-day heading and single room photo | Relevant arrival heading and four selected photographs | Introduce the place and journey |
| Independent venue facts, map, transport and arrival blocks | Airport, city travel and conference arrival chapters | Follow the visitor's actual reading sequence |
| Static map with no exploration | Geographic overview with scroll-following camera and focus/tap/hover details | Connect locations while keeping native scrolling |
| Desktop reading structure carries into phone | Flowing mobile chapters and compact map orientation | Avoid a pinned text trap and retain all guidance |

## Direction contract

An architectural purple-tinted gallery opens with `Your way to MSRC`. A dark
plum, locally served geographic Jeddah atlas then fills the screen. Three
chapters occupy natural page scroll; one smooth spatial move follows each
chapter, while its readable foreground stays stable. Airport, Jeddah and venue
information points respond to hover, keyboard focus and tap. Existing transport
choices, approved times, venue address and arrival details remain available.
The accurate campus map and external navigation links remain at arrival.

Use the existing Manrope/Noto Arabic, motion curves, champagne actions and
fine raster grain. Selected keywords inherit the accepted accent treatment.
No wheel interception, auto-advance, animated reading text, perpetual decoration,
map SDK, analytics event, third-party request or new pause control. No-JS content
and ordinary section anchors remain usable. Reduced motion uses a static map;
short viewports, phones and enlarged text use natural reading flow.

## Factual boundaries and evidence

Retain ORG-031/034/035 config and copy: King Faisal Conference Center at KAU,
Jeddah; taxi, train and rental guidance; only existing approved travel times;
entry/ticket/parking/accessibility/on-site/Wi-Fi details and visa responsibility.
No new terminal pickup, gate, shuttle, parking guarantee, fare, travel estimate
or driving route. Geographic connection is an arrival overview, not navigation.
North orientation never mirrors in Arabic. Source maps remain local with OSM
attribution; the airport reference point is an aerodrome point, not pickup.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.

Whiteout was inspected live: full-screen landscape, progressive camera, persistent
route index and concise location chapters. The Magnific reference supplies the
city-map/marker idea; its licensed artwork is not reused. Four exact user-selected
Google Maps photographs are staged and inspected; record provenance separately.

## Verification plan

Build fully, then batch desktop, phone, RTL, short viewport and reduced-motion
visual evidence once. Fix all material findings in one batch and confirm at most
once. Run one Impeccable detector and an independent finish review. Verify native
scroll progress, hover/tap/keyboard details, anchor navigation, no-JS content,
photo loading, 200% text, no overflow, axe and absence of external map requests.
Keep existing geographic/provider/config/privacy assertions; update only changed
composition expectations. Run local lint/types/units/build, focused browser checks
and required hosted checks. Deliver a review PR and preview, with hardware phone
limits and any unresolved checks stated; do not merge this PR.

## Observed local verification

- Integrated main PR 58 (`1f1c558`), retaining its phone grid changes and both
  progress records. `pnpm check` passed lint, types, 2,399 units in 61 files
  and an 81-page build: `.tools/venue-journey-integrated-check.log`.
- Full focused runs retained their failure evidence: 96/2/5, 97/2/4 and
  100/2/1 (pass/skip/fail, 103 cases). Further confirmation stayed limited to
  the failed interactions and existing rail regressions rather than rescanning.
- Popup positioning now measures the border box, flips/clamps to the viewport
  and keeps a real hover bridge. It shares the camera's exact 1200px boundary.
  The inherited intro contrast uses the existing muted token.
- A native smooth-scroll delta survived switching to instant during keyboard
  gallery reversal. Item controls now use consistent native smooth retargeting;
  reduced motion stays instant, and the default rails keep their behavior.
- Genuine upper-edge pointer checks exposed transparent reading space masking
  a geographic pin. Cinematic whitespace now passes pointer events through;
  actual text remains selectable and native links/disclosures remain usable.
  The final CSS builds: `.tools/venue-journey-pointer-build.log`.
- Hit-region targeted browser run: **16 passed, zero failures/skips**, one worker,
  zero retries. It proves EN/AR gallery and keyboard reversal, true below-flip
  popups at 1200/1300px, complete bounds, hover persistence, Escape/focus/Enter,
  phone anchors and unchanged speakers/media controls. Receipt:
  `.tools/venue-journey-hit-region-final.log`; four edge proof images and the
  desktop/phone/RTL captures are under `.impeccable/review/venue-journey/`.
- The visual review then caught reading text painting over an otherwise in-bounds
  English panel. Cinematic copy now reserves 20rem for map context, and panels
  clamp outside the reading rectangle on the correct EN/AR side. **32/32 cases
  passed**, all 24 Venue tests plus eight unchanged rails, including exact
  non-overlap, 200% text, short/reduced/no-JS reading and native disclosures.
  Receipt: `.tools/venue-journey-map-column-browser.log`.
- Independent final disposition is **ship**, scoped to both original findings.
  All four 1200/1300px EN/AR screenshots show complete panel text. The invisible
  hover bridge also extends to the pin center after horizontal clamping;
  **4/4 final popup cases pass** with an actual 12-step diagonal mouse approach,
  all previous bounds/non-overlap/Escape assertions and mobile anchors retained.
  Receipt: `.tools/venue-journey-bridge-browser.log`.
- Final source `pnpm check` also passes lint, types, 2,399/61 unit coverage and
  the 81-page build: `.tools/venue-journey-final-check.log`. Hosted checks and
  the owned exact-head Preview will be verified after the review PR is opened.
- Initial hosted head `51c2d148` passed nine substantive jobs and failed one
  public tooltip case (638 pass / 41 skip / 1 fail across 680 public cases).
  The trace proves locator hover programmatically scrolled the document and
  hidden atlas, moving the camera while popup geometry was sampled. The regular
  phase now waits for fonts/camera settlement and uses measured native pointer
  movement, with new unchanged document/atlas scroll-offset assertions. All
  original bounds/gap/persistence/Escape/focus/Enter assertions, retries and
  timeouts remain. **4/4 popup and 2/2 camera confirmations pass locally**;
  application source is unchanged. New exact-head CI precedes final handoff.
- Final head `ee1f21357a284b2d2c3274c9df5b9ebdb4672763`: **all three workflows,
  ten substantive jobs, eleven checks and Vercel pass**. Public browsers:
  **639/41/0** (pass/intentional skip/fail), 680 cases; units 2,399/61 files;
  build 81 pages. Remaining synthetic auth/contact/participant/staff/database
  coverage also passes. Initial failure and final receipts remain separate.
- Owned Preview `dpl_EFsNJNRTuu4yiXRYerKYVGrea69R` is READY at the same head,
  project/team/source proven by API/CLI. Final hosted desktop/390px EN/320px AR
  inspection confirms native camera/anchors, all four photos, direct language
  switching and no narrow RTL overflow. `hosted-*.jpg` captures and
  `.tools/venue-hosted-checks-ee1f213-final.json` preserve the evidence. PR 59 is
  OPEN/UNMERGED; final receipts are recorded locally and in its body without
  changing the tested commit. Hardware/screen-reader/performance lab and actual
  production publication remain outside this verification.
- The single detector returned 49 advisories and no primary findings before
  the final interaction corrections. No second detector or global token change.
  Physical iOS/Android hardware, screen-reader use and performance lab metrics
  are **NOT TESTED**. These checks do not prove publication or operational launch.
