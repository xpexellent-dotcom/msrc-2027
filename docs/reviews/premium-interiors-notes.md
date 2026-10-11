# Program and Venue refinement — 11 October 2026

Scope: ENG-024 local approval demo; DSN-01/02, LOC-01/03, ACC-01, CFG-01,
PRG-01. This lane follows the shared audit in premium-refinement-brief.md.
Approved dates, venue/address, arrival guidance and closed workflows are unchanged.

## Audit before editing

| Before | After | Why |
| --- | --- | --- |
| Program photo in a separate band below a solid purple masthead | The same real stage photo becomes the softly blurred, purple-tinted header | Gives the header context without adding another image section |
| Conference dates read as secondary metadata | Two prominent linked dates on a light panel, with matching Day 1 / Day 2 destinations | Makes planning and the selected program day immediately understandable |
| Gold venue calendar with noninteractive dates | White / pale-gray calendar, a quiet hover glow and full-row date links | Matches the requested material and makes the apparent affordance real |
| Venue facts in an undifferentiated list | City, Host, Conference venue and Address in clear boxes with consistent stroke icons | Improves scanning without changing the approved facts |
| Travel rows reserve three columns even without a time value | Responsive cards with heading, guidance and optional time in natural order | Removes awkward gaps, prevents overlap and preserves absent-value behavior |
| Tall schematic with illustrative roads | Detailed geographic map from real OpenStreetMap geometry and a sourced venue point | Replaces approximated routes with actual streets, campus boundary and buildings |

## Implemented

- Shared photographic treatment on Program and Venue: 5px image blur, dark purple
  tint, ivory type, lilac keywords and a 1.5% to 4.5% hover scale over 700ms expo-out.
  Only the decorative image transforms. Reduced motion disables the transition.
- Date links use the existing configuration and localized Gregorian formatter.
  Day 1 selects /program?day=day1; Day 2 selects /program?day=day2, in the current
  language. No session or doors-opening time is invented.
- Two linked date panels use pale surfaces and 220ms opacity-only glow. Each link
  has a clear arrow, press feedback and immediate keyboard focus.
- Real KAU venue photograph is reused from the prior approved local asset.
- Four venue facts, three airport travel options and six configured arrival
  details use consistent icons and responsive boxes. All approved guidance
  remains exact, including optional-value suppression.
- Get directions is a 60px-tall primary action. Google, Apple and Waze links retain
  explicit user activation, noopener noreferrer and no-referrer behavior.
- The map is entirely local. There is no SDK, iframe, tile request, geolocation,
  provider preload or external request during page reading.

## Geographic map evidence

The map is geographic, north-up and at a constant local scale. It does **not**
draw a suggested driving route or claim event gate routing.

- Data: [OpenStreetMap API bounding-box extract](https://api.openstreetmap.org/api/0.6/map?bbox=39.228,21.484,39.260,21.505),
  retrieved 11 October 2026. Roads, buildings, university boundary, parking and
  green-space geometry are projected directly, with no hand-drawn street layout.
- Venue point: 21.492891, 39.241681, from the mapping provider's
  [conference-center building listing](https://yandex.com/maps/114139/jeddah/house/Z0AYdANhT00GQFxrfXh4c3RqZQ%3D%3D/inside/).
  This is a cartographic landmark, not an organizer-approved entrance coordinate.
  Outbound directions continue to use the approved address.
- Official context: [KAU facilities and services](https://kau.edu.sa/en/page/facilities-and-services)
  names the center, supplies its actual photograph and links the corresponding
  Google place. The map-embed camera center is not used as a venue pin.
- Abdullah Sulayman Street label is anchored near actual OSM node 507108440
  (21.4842905, 39.2430891). It is omitted in the tighter portrait crop where the
  street falls outside the displayed area.
- Projection: local equirectangular around 21.4935° latitude, 2.5 metres per
  authored pixel; longitude scales by cosine of that latitude. Desktop is
  1200×650; portrait is 500×650. Both carry a north arrow and 200m scale.
- Visible attribution links to OpenStreetMap's copyright page. SVG metadata
  carries ODbL source, source URL, retrieval date, projection, scale and point.
- Assets: public/media/msrc-demo/venue-map-{en,ar}-{landscape,portrait}.svg.
  Source receipt: .tools/venue-osm-source.osm; reproducible transformation:
  .tools/build-venue-map.mjs. No raster image generation or map-tile harvesting.
- Overpass returned HTTP 406 on the first request. The standard OSM map API
  provided the extract successfully. No bypass was used.

## Validation

- **PASS:** targeted ESLint on changed components and both changed browser specs,
  zero warnings after removing an unnecessary lint suppression.
- **PASS:** vitest run tests/unit/venue-travel.test.ts tests/unit/conference-dates.test.ts:
  41 tests / 2 files. Supplied/absent values, approved guidance, address encoding,
  date rules and calendar behavior remain covered.
- dates-venue.spec.ts now additionally checks that venue date clicks and
  keyboard activation in the Program date panel select the matching day, and
  that reduced-motion photo transitions are off.
- venue-travel.spec.ts retains its privacy, localization, approved guidance,
  optional fields, provider links, keyboard, narrow-width, Axe and language-route
  assertions. Schematic-only expectations are replaced with actual rendered SVG
  label collision/clipping checks, local-source checks, north-up direction and
  geographic projection/point/source assertions.
- Full build and application browser checks are delegated to the root verification
  batch. No server was started or stopped by this lane. No hosted changes.

## Bounded correction after the root review

The first browser batch found one Venue failure at 320px with text enlarged to
200%: document width was 384px. Live geometry traced it to the min-content width
of the “Accessibility support” icon/text label and smaller text spills inside
padded cards. The header stayed within the viewport.

The correction gives icon headings natural flex wrapping and permits long text
to break within the actual card width. It does not hide overflow or reduce text.
The root visual review also found that the old generic section spacing applied
only to the homepage; explicit Venue section padding now restores its rhythm:
clamp(4rem, 7vw, 7rem), with 4rem on phones.

Diagnostic geometry with the revised stylesheet, in English and Arabic at 320px
and 200% text, reports 320px document width, zero overflow in the affected content,
and 128px block padding on each Venue chapter. No screenshots or test assertions
were replaced. The root owns the rebuilt-application confirmation run.
