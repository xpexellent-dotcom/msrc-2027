import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

// Offline renderer. The one-time Overpass response and receipt are retained in
// ignored .tools; see docs/media/venue-journey-map.md for the exact source query.
const sourcePath = process.argv[2] ?? '.tools/venue-journey-map-source.json';
const outputPath = 'public/media/msrc-demo/venue-journey-city.svg';
const expectedSourceHash = '0b01b6468dad8221d592eb2bf3db11480ad2fead79cbff6f575ca57cd2b5e726';
const sourceBytes = fs.readFileSync(sourcePath);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(sourceBytes), expectedSourceHash, 'Source differs from the reviewed geographic snapshot');
const source = JSON.parse(sourceBytes);
assert.equal(source.remark, undefined, 'Overpass response is incomplete');

const width = 1400;
const height = 1700;
const bounds = { west: 39.04, east: 39.32, south: 21.43, north: 21.75 };
const project = ({ lon, lat }) => [
  ((lon - bounds.west) / (bounds.east - bounds.west)) * width,
  ((bounds.north - lat) / (bounds.north - bounds.south)) * height,
];
const venue = project({ lon: 39.241681, lat: 21.492891 });
const airportReference = project({ lon: 39.1562, lat: 21.68110588235294 });
assert.deepEqual(venue.map(Math.round), [1008, 1366]);
assert.deepEqual(airportReference.map(Math.round), [581, 366]);

const ways = source.elements.filter((element) => element.type === 'way' && element.geometry?.length > 1);
const coastalWays = ways.filter((way) => way.tags.natural === 'coastline');
const starts = new Map(coastalWays.map((way) => [way.nodes[0], way]));
const ends = new Set(coastalWays.map((way) => way.nodes.at(-1)));
const mainlandStarts = coastalWays.filter((way) => !ends.has(way.nodes[0]));
assert.equal(mainlandStarts.length, 1, 'Expected one continuous north-to-south mainland coastline');
const visited = new Set();
const chains = [];
for (const first of [...mainlandStarts, ...coastalWays]) {
  if (visited.has(first.id)) continue;
  let current = first;
  const geometry = [];
  const ids = [];
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    ids.push(current.id);
    geometry.push(...(geometry.length ? current.geometry.slice(1) : current.geometry));
    current = starts.get(current.nodes.at(-1));
  }
  const closed = geometry[0].lat === geometry.at(-1).lat && geometry[0].lon === geometry.at(-1).lon;
  chains.push({ geometry, ids, closed });
}
assert.equal(visited.size, coastalWays.length, 'Every coastline way must be accounted for');
const mainland = chains.find((chain) => !chain.closed);
assert.equal(chains.filter((chain) => !chain.closed).length, 1, 'Do not close an incomplete coastline inside the viewport');
assert.ok(mainland.geometry[0].lat > bounds.north && mainland.geometry.at(-1).lat < bounds.south,
  'Mainland closure must stay outside the rendered north/south extent');

const pointString = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const pathData = (geometry) => geometry.map((point, index) => `${index ? 'L' : 'M'}${pointString(project(point))}`).join('');
const paths = (features) => features.map((feature) => pathData(feature.geometry)).join('');
const mainlandPath = `${pathData(mainland.geometry)}L${width + 100},${project(mainland.geometry.at(-1))[1].toFixed(1)}L${width + 100},${project(mainland.geometry[0])[1].toFixed(1)}Z`;
const islands = chains.filter((chain) => chain.closed);
const campus = ways.filter((way) => way.tags.wikidata === 'Q1795928' && way.tags.amenity === 'university');
assert.equal(campus.length, 1, 'Expected the sourced King Abdulaziz University boundary');
const roads = ways.filter((way) => /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(way.tags.highway ?? ''));
const runways = ways.filter((way) => way.tags.aeroway === 'runway');
const railway = ways.filter((way) => way.tags.railway === 'rail' && way.tags.usage === 'main');
const roadStyles = [
  ['tertiary', '#51435f', 0.70, 0.62],
  ['secondary', '#61516f', 0.95, 0.78],
  ['primary', '#746482', 1.30, 0.90],
  ['trunk', '#746482', 1.70, 1],
  ['motorway', '#746482', 2.00, 1],
];
const roadLayers = roadStyles.map(([classification, color, lineWidth, opacity]) => {
  const group = roads.filter((way) => way.tags.highway.replace('_link', '') === classification);
  return `<path data-layer="${classification}" d="${paths(group)}" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}"/>`;
}).join('\n');

const metadata = {
  attribution: '© OpenStreetMap contributors',
  copyright: 'https://www.openstreetmap.org/copyright',
  dataLicense: 'https://opendatacommons.org/licenses/odbl/1-0/',
  sourceEndpoint: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  sourceSha256: expectedSourceHash,
  osmTimestamp: source.osm3s.timestamp_osm_base,
  projection: 'north-up linear longitude/latitude mapping to the specified extent; not a navigation chart',
  bounds,
  dimensions: { width, height },
  sourceFeatures: { roads: roads.length, coastlines: coastalWays.length, runwayWays: runways.length, railwayWays: railway.length, campusWays: campus.length },
  campusOsmWay: campus[0].id,
};
const escapeXml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-map-projection="linear-lon-lat" data-north-up="true">
<title>Jeddah geographic overview</title>
<desc>OpenStreetMap coastline, major roads, runways, main railway and King Abdulaziz University boundary. North up. No driving route is depicted. The containing component provides visible OpenStreetMap attribution.</desc>
<metadata>${escapeXml(JSON.stringify(metadata))}</metadata>
<defs><clipPath id="map-extent"><rect width="${width}" height="${height}"/></clipPath></defs>
<rect width="${width}" height="${height}" fill="#181322"/>
<g clip-path="url(#map-extent)">
<path data-layer="mainland" d="${mainlandPath}" fill="#22172f"/>
<path data-layer="islands" d="${islands.map((island) => `${pathData(island.geometry)}Z`).join('')}" fill="#22172f"/>
<path data-layer="coastline" d="${paths(coastalWays)}" fill="none" stroke="#493951" stroke-width="0.85"/>
<path data-layer="campus" data-osm-way="${campus[0].id}" d="${pathData(campus[0].geometry)}Z" fill="#3d2b4b" stroke="#685373" stroke-width="0.85" opacity="0.85"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">${roadLayers}
<path data-layer="railway" d="${paths(railway)}" stroke="#6c597d" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.58"/>
<path data-layer="runways" d="${paths(runways)}" stroke="#9a85ad" stroke-width="3.1" opacity="0.7"/>
</g></g></svg>\n`;
assert.ok(!/(?:NaN|Infinity|<image\b|<text\b|<script\b)/.test(svg));
fs.writeFileSync(outputPath, svg);
console.log(JSON.stringify({ outputPath, bytes: Buffer.byteLength(svg), sha256: hash(svg), ...metadata.sourceFeatures, coastlineChains: chains.length, venue, airportReference }, null, 2));
