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
`docs/reviews/venue-journey.md` and `docs/reviews/venue-mobile-exploration.md`.
ENG-031 authorizes publication after final-head checks and hosted verification.

## Brand fit and local extension

Keep the cinematic congress identity: Manrope display, Inter reading text,
independent Noto Sans Arabic metrics, ivory ground, purple photographic tint,
warm invitation accents, fine raster grain and native navigation. Existing
global tokens, header and public actions remain the authority. The gallery uses
the established (16px) photo corners and stationary captions; campus orientation
shares the familiar ivory opening with the single photo carousel.

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

The ivory opening has a (100svh) desktop minimum and generous top clearance.
Three columns (.85fr / 1.1fr / .85fr) hold a short introduction, the existing
landscape campus map with two directions actions, and one photo carousel card.
Crops and purple-to-plum caption scrims remain authored per photograph.
Fine grain is a local (.045) overlay.

The journey uses a sticky (100svh) atlas behind three ordinary document sections:
airport, city connection and conference arrival. Each desktop chapter has a
(110svh) minimum and content-driven height, with (6–10rem) vertical padding.
A narrow sticky chapter index accompanies a reading column capped at (38rem),
reserving (20rem) of its available column width for geographic context;
lead and note text use a (44ch) measure. Transport uses native disclosures and
fine separators; address and configured visitor details use two columns. The
international-attendee guidance follows in an ivory disclosure section, then
the existing Program link and closed schedule status. Campus orientation and
external directions are in the opening; no lower map or date panel is repeated.

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
feedback. Index and continuation destinations are ordinary anchors. Hydrated map
points open bounded, nonmodal detail sheets; without JavaScript they remain
ordinary chapter anchors. Explicit keyboard activation focuses the sheet heading;
Close/Escape restores the trigger or current chapter. Sheets close when a chapter
changes or the atlas leaves view without taking focus on passive scrolling.

Map pins retain their visible size while the map scales. Visible pins provide
fine-pointer hover and keyboard-focus context; Escape dismisses that context.
Panels are clamped to the atlas viewport and the free map area beside the
reading rectangle, so foreground text cannot paint over their content. They
flip below near the upper edge and can scroll vertically when needed. Blank
reading space passes through pointer events; actual text stays selectable.
Points outside the current camera view leave the focus order. Transport,
arrival-essentials and international guidance use initially closed native
disclosures; transport supports fine-pointer hover as an enhancement.
Zoom in, zoom out and reset are 44px controls. Press feedback scales only the SVG
icon (.9 / 100ms), preserving the clickable region; keyboard/reduced motion respond
immediately. They change framing, never the page's native scroll. Inactive
chapters gently fade to (.7) opacity over (200ms)
while remaining readable; focus, keyboard use and reduced motion restore opacity.

Gallery hover scales only the image to (1.045) over (600ms). Keyboard camera,
point and index response removes transition delay. Reduced motion keeps a
static overview and permits immediate deliberate zoom/point exploration.
Server-rendered chapters, native disclosures, photographs and ordinary
anchors remain available without JavaScript. No wheel interception, autoplay,
moving reading text, perpetual decoration or additional pause control is added.

## Responsive and bilingual conventions

Below (1200px), or at viewport heights of (640px) or less, use a compact map of
`clamp(11rem, calc(34svh - 4rem), 16rem)` sticky below the header. Three chapter controls remain
directly beneath it, with native content scrolling below. Camera calculations use
the atlas height, so taps and framing work on phones. The layout reserves this
space before hydration, including direct chapter URLs. At root fonts above
(24px), or heights of (480px) or less, the map/index return to natural flow and
chapters lose viewport minimums. Map controls and tapped details remain usable.
At (650px) and below, address and visitor details become one column. Hover-only
context is omitted in compact layouts; the bounded tap sheet provides the same
information. Manual exploration introduces no drag or wheel interception.

ENG-032 puts the landscape campus map into the opening at every width. Desktop
uses three columns; tablet has an intro above two media columns; phones become
one column without a viewport minimum. Four photos occupy one native carousel
card at every width: 100% item width, mandatory snap, 8:5 desktop / 4:3 phone,
visible 44px Previous/Next arrows. Keyboard and reduced-motion changes are instant;
pointer changes retain native smooth scrolling. Swipe remains available without JS.

The compact pinned frame reserves measured chapter-control height and uses
horizontal 44px map controls. Its upper scrim blurs passing text only while pinned.
Reading flow has a 15rem minimum and no sticky frame. Reduced motion uses immediate
chapter framing on normal phones and a fitted static overview in reading flow.
Pins outside the map or intersecting credits/controls leave the focus order.
Google and Apple remain explicit outbound actions; Waze is removed.

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
ENG-031 supersedes ENG-030's review-only boundary for public UI publication.
Operational activation remains outside this task's authorization.
