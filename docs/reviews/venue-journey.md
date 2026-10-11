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
