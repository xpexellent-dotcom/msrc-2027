---
version: 1
slug: venue-journey
primary_target: "src/app/[locale]/(preview)/dates-venue/page.tsx"
related_targets: ["src/components/venue-arrival-journey.tsx", "src/components/venue-photo-gallery.tsx", "src/styles/venue-journey.css", "src/styles/venue-gallery.css", "src/content/venue-journey.ts"]
---

# Venue journey

Mode: Experience. Extend the established MSRC world; its colors, fonts, actions,
navigation, factual content and accessibility remain authoritative. The user's
pinned composition is a four-photo purple gallery and a full-screen geographic
arrival journey from airport to city travel to venue. Build directly in code.
Direction contract, exact write scope and bounded verification:
`docs/reviews/venue-journey.md`. Deliver a separate PR and preview for review;
this task does not authorize merge or production publication.

## Brand fit and local extension

Keep the cinematic congress identity: Manrope display, Inter reading text,
independent Noto Sans Arabic metrics, ivory ground, purple photographic tint,
warm invitation accents, fine raster grain and native navigation. Existing
global tokens, header and public actions remain the authority. The gallery uses
the established (16px) photo corners and stationary captions; the final campus
orientation returns to the familiar ivory reading surface.

The dark journey adds local plum (#191222), lilac reading text (#ded2e8) and pale
champagne (#eddaaf), with opaque plum (#30223e) point details. These are component
materials, not new global palette approvals. The hero's selected phrase is solid
purple and the chapters' second title line is solid pale champagne: a local
variation from DESIGN.md's selected-gradient heading pattern. Review that choice
with this PR; do not replace the global heading rule. Ordinary prose stays solid.

ENG-030 supersedes the earlier Venue title/date-panel and boxed travel composition
for this surface. The gallery and chapter sequence take their place; Program
remains the date/calendar destination. This is a composition extension within the
accepted brand, with no replacement identity or global design-token change.

## Layout and geometry

The ivory opening has a (100svh) minimum, generous top clearance and a two-column
(.9fr / 1.1fr) composition. A short introduction and arrival anchor sit beside a
two-by-two gallery. Photos have a near-square (1.03) ratio and alternating
(-.75rem / 1.75rem) vertical offsets; crops and purple-to-plum caption scrims are
authored per photograph. Fine grain is a local (.045) overlay.

The journey uses a sticky (100svh) atlas behind three ordinary document sections:
airport, city connection and conference arrival. Each desktop chapter has a
(110svh) minimum and content-driven height, with (6–10rem) vertical padding.
A narrow sticky chapter index accompanies a reading column capped at (38rem);
lead and note text use a (44ch) measure. Transport uses native disclosures and
fine separators; address and configured visitor details use two columns. The
campus map, external directions and international-attendee guidance follow in
an ivory section, then the existing Program link and closed schedule status.

The local city atlas has a fixed geographic image space (1400 × 1700). Camera
references are airport (581, 366), a city composition (800, 850), then venue
(1008, 1366), with zoom factors (1.12 / 1.02 / 1.55). Only airport and venue are
place markers. The middle reference is not a pickup, stop or named destination.
The camera changes framing; it does not draw or claim a driving route.

## Motion and interaction

Native scroll drives one frame-coalesced camera update. The chapter reading line
normally sits at (45%) of the viewport and respects the anchor/header clearance.
Camera travel uses smooth interpolation and a (480ms) transform transition with
`cubic-bezier(.23,1,.32,1)`; foreground copy stays still. The active chapter uses
`aria-current="location"`, a filled dot, weight and arrow, with (180ms) color
feedback. Index, continuation and map-point destinations are ordinary anchors.

Map pins retain their visible size while the map scales. Visible pins provide
fine-pointer hover and keyboard-focus context; Escape dismisses that context.
Panels are clamped to the atlas viewport and can scroll vertically when needed.
Points outside the current camera view leave the focus order. Touch activation
follows the corresponding chapter anchor. Transport disclosures start open and
support native keyboard/tap toggling; fine-pointer hover can reopen them.

Gallery hover scales only the image to (1.045) over (600ms). Keyboard camera,
point and index response removes transition delay. Reduced motion keeps the map
at its static CSS view and removes pin/index/photo/arrow transitions. Server
rendered chapters, initially open travel details, photographs and ordinary
anchors remain available without JavaScript. No wheel interception, autoplay,
moving reading text, perpetual decoration or additional pause control is added.

## Responsive and bilingual conventions

Below (1200px), at viewport heights of (640px) or less, or when the measured root
font exceeds (24px), use natural reading flow. The atlas becomes an overview of
`min(34rem, 65svh)`, the index wraps in normal flow, camera motion stops and
chapters lose their viewport minimum. At (650px) and below, address and visitor
details become one column. Hover-only context is omitted in flow layouts;
chapter content still contains the practical information.

At (800px) and below, the opening becomes a single column without a viewport
minimum. The four photographs become a native horizontal rail: (84%) item width,
(4:3) ratio, proximity snapping, no stagger, visible Previous/Next controls and
one-photo advancement. Keyboard and reduced-motion rail controls move immediately;
pointer controls use native smooth scrolling. Swipe browsing remains available.

Arabic mirrors reading composition and shade direction, never geography. The
map plane stays LTR and north-up in both locales; point text adopts the locale's
direction. Arabic display text uses zero tracking and (1.4–1.5) line-height.
Forced colors remove the atmospheric city atlas and restore system text/surface
colors. Print omits the atlas/index, shortens chapter spacing and displays the
photo grid with readable content.

## Content, provenance and review boundary

Use approved venue configuration and existing EN/AR transport, address, visitor,
time-zone and visa copy. Keep local OpenStreetMap geometry, visible attribution,
north orientation and the existing campus map. External provider links are
explicit visitor actions; this surface adds no map SDK, provider prefetch or
third-party map request on load. The airport reference is an aerodrome point,
not terminal pickup guidance. Preserve selected-photo and map provenance.

Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.
This note records implemented conventions from source. Browser, geography,
accessibility, physical-device, build and hosted-check results belong in the
review receipts and PROGRESS.md; this note makes no final-check or release claim.
Deliver the separate review PR and preview. Merge, production publication and
operational activation remain outside ENG-030's authorization.
