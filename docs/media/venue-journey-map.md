# Venue journey: Jeddah geographic overview

Prepared 12 October 2026 (Asia/Riyadh). Asset:
`public/media/msrc-demo/venue-journey-city.svg`.
Renderer: `scripts/build-venue-journey-map.mjs`.

This is a locally served rendering of real OpenStreetMap geometry, not generated
imagery or a schematic street grid. It contains the Jeddah coastline, major roads,
runways, main railway, and King Abdulaziz University boundary. No route, travel
time, gate, parking area, transport recommendation, label, photograph, or location
marker is drawn into the SVG. The containing component supplies its own approved
labels and visible attribution. Nothing in this asset loads a map provider at
runtime.

## Source and license

- Geographic source: [OpenStreetMap](https://www.openstreetmap.org/).
- Successful read-only Overpass endpoint:
  `https://maps.mail.ru/osm/tools/overpass/api/interpreter`, listed by the
  [OpenStreetMap Overpass documentation](https://wiki.openstreetmap.org/wiki/Overpass_API).
- Retrieved: `2026-10-11T21:12:24.773Z`, HTTP 200.
- OSM database timestamp: `2026-10-11T21:09:57Z`.
- Source: `.tools/venue-journey-map-source.json`, 4,960,044 bytes, 5,098 elements.
- Source SHA-256:
  `0b01b6468dad8221d592eb2bf3db11480ad2fead79cbff6f575ca57cd2b5e726`.
- Download receipt: `.tools/venue-journey-map-receipt.json`; exact query also
  retained in `.tools/venue-journey-map-query.txt`. These local source files are
  ignored by Git and must be retained for an exact offline rebuild.
- Map data attribution: **© OpenStreetMap contributors**. Data is under the
  [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  The visible credit must link to
  [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright).
  Source, license, hash, extent, and source timestamp are also embedded in SVG
  metadata. Metadata does not replace visible attribution in the component.

The main `overpass-api.de` endpoint returned HTTP 504. The former Kumi endpoint
and its documented replacement, Private.coffee, returned HTTP 500. No output
geometry was synthesized from those failures. The same bounded query succeeded
at the documented VK Maps mirror; all rendering uses that single successful
download. No subsequent data refresh is performed by the renderer or website.

## Exact source query

The successful request used HTTP GET with this query URL-encoded in the `data`
parameter. The coastline query has a small buffer so its connected mainland
chain continues beyond the rendered north and south edges.

```overpass
[out:json][timeout:90];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"](21.43,39.04,21.75,39.32);
  way["natural"="coastline"](21.40,39.00,21.78,39.35);
  way["aeroway"="runway"](21.43,39.04,21.75,39.32);
  way["railway"="rail"](21.43,39.04,21.75,39.32);
  way["amenity"="university"](21.48,39.22,21.515,39.28);
  relation["amenity"="university"](21.48,39.22,21.515,39.28);
);
out body geom;
```

This snapshot contains 4,946 renderable major-road ways, 57 coastline ways,
13 runway way segments, 49 railway way segments tagged `usage=main`, and the
campus boundary. The airport's three long runways are split across multiple OSM
ways; 13 is a geometry-segment count, not a count of airport runways. University
faculties and other nearby universities returned by the source query are omitted.
The campus uses OSM way **1072356349**, tagged `amenity=university` and
`wikidata=Q1795928` (King Abdulaziz University).

## Projection and geometry

SVG dimensions and viewBox: **1400 × 1700**. Extent: longitude **39.04–39.32**,
latitude **21.43–21.75**. North is up in both locales. The image must not be
mirrored for Arabic.

```text
x = (longitude - 39.04) / (39.32 - 39.04) × 1400
y = (21.75 - latitude) / (21.75 - 21.43) × 1700
```

This is the page's shared linear longitude/latitude projection, not Web Mercator
or a precision navigation chart. The established venue point
`39.241681, 21.492891` projects to **1008.405, 1365.892**, rounding to the component
reference **1008, 1366**. The component's airport reference **581, 366** corresponds
to `39.1562, 21.68110588235294`; its round-trip projection is exact within floating
point precision. This validates placement math only; it does not establish an
airport pickup terminal or meeting point.

Coastline ways are joined only where their OSM endpoint node IDs match. The
snapshot forms one continuous mainland chain and 15 closed island chains. The
mainland polygon is closed outside the viewport on its eastern side after
checking that both chain endpoints lie beyond the north/south bounds. This is
polygon filling at the map extent, not added coastal geography. All geometry is
clipped to the viewport. Source coordinates are projected and rounded to one
decimal pixel; no street paths are interpolated, simplified, or invented.

Background: land `#22172f`, sea `#181322`. Roads use a restrained hierarchy from
subtle tertiary lines to `#746482` major roads. The source geometry determines
the street pattern; no decorative grid is added. Runway stroke width is styled
for legibility and is not a dimensional runway survey.

## Rebuild and validation

From the repository root, with the preserved source snapshot present:

```sh
node scripts/build-venue-journey-map.mjs
```

An alternative path to an identical source file may be supplied as the first
argument. The renderer makes no network requests and checks the source SHA-256
before writing the asset. Re-running the query against current OSM data is a
new source snapshot, not guaranteed to reproduce this reviewed image. To inspect
historical geometry through an Overpass server with attic data, use the recorded
database timestamp as a `[date:"2026-10-11T21:09:57Z"]` query setting; preserve and
review that response separately because response metadata may differ.

Observed checks:

- PASS: source hash; complete response; all 57 coastline ways accounted for;
  one continuous mainland chain with closure outside the viewport; exact campus
  boundary identity; venue and airport reference projection assertions.
- PASS: SVG renders with Sharp/librsvg and was visually inspected at 700 × 850.
  The coastline is at left, the airport runways at north, and the university
  boundary toward the southeast. No route or labels are present.
- PASS: no embedded raster images, script, external asset request, text label,
  NaN, or infinite coordinate in the generated SVG.
- Output: **740,197 bytes**; gzip estimate **270,813 bytes**.
- SVG SHA-256:
  `5a8110748e969d18944edebda16c381a67110c08ab388f812960bc7403b3fa43`.
- NOT TESTED by this asset task: integration with the journey component,
  responsive framing, keyboard interaction, and production delivery. The map
  component owner performs those checks with the final labels and attribution.
