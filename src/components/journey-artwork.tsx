/**
 * Small, static SVG studies from each participation path's subject. Placement and
 * clipping belong to the containing artwork slot; fixed seeds keep hydration exact.
 */
export type JourneyArtworkMotif = "registration" | "submissions" | "workshops" | "hackathon" | "threeMinuteThesis";

type Geometry = { cx: number; cy: number; seed: number };
type Point = readonly [number, number];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (value: number) => value.toFixed(1);

/** Attend: a contour island with one small point of discovery. */
function Contours({ cx, cy, seed }: Geometry) {
  const ring = (radius: number, index: number) => {
    const count = 24;
    const points = Array.from({ length: count }, (_, step): Point => {
      const angle = step / count * Math.PI * 2;
      const wobble = 1 + .09 * Math.sin(3 * angle + seed * .35) + .045 * Math.sin(5 * angle - index * .12 + seed);
      return [cx + Math.cos(angle) * radius * wobble * 1.12, cy + Math.sin(angle) * radius * wobble * .84];
    });
    const at = (step: number) => points[(step + count) % count];
    let path = `M${n(at(0)[0])} ${n(at(0)[1])}`;
    for (let step = 0; step < count; step++) {
      const [p0, p1, p2, p3] = [at(step - 1), at(step), at(step + 1), at(step + 2)];
      path += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
    }
    return `${path}Z`;
  };
  return <>
    {Array.from({ length: 8 }, (_, index) => <path key={index} d={ring(29 + index * 29, index)} />)}
    <circle cx={cx + 5} cy={cy - 3} r="3.5" className="journey-art-dot journey-art-dot--gold" />
  </>;
}

/** Abstracts: a loose field of findings around a single fitted curve. */
function Scatter({ cx, cy, seed }: Geometry) {
  const next = seeded(2027 + seed * 31);
  const lift = 140 + next() * 35;
  const curve = (t: number): Point => [cx - 245 + t * 490, cy + lift - (lift * 2) * t + 40 * Math.sin(Math.PI * t)];
  const dots = Array.from({ length: 39 }, (_, index) => {
    const t = (index + next()) / 39;
    const [x, y] = curve(t);
    return { x: x + (next() - .5) * 26, y: y + (next() - .5) * (65 + 35 * (1 - t)), r: 1.6 + next() * 1.2 };
  });
  const line = Array.from({ length: 13 }, (_, index) => curve(index / 12));
  return <>
    <path d={`M${cx - 255} ${cy - 100}H${cx + 250}M${cx - 255} ${cy + 10}H${cx + 250}M${cx - 255} ${cy + 120}H${cx + 250}`} className="journey-art-faint" />
    <path d={`M${line.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}`} className="journey-art-accent" />
    {dots.map((dot, index) => <circle key={index} cx={n(dot.x)} cy={n(dot.y)} r={n(dot.r)} className="journey-art-dot" />)}
  </>;
}

/** Workshops: a measuring grid, pencil guides and a few unfinished marks. */
function Lattice({ cx, cy, seed }: Geometry) {
  const next = seeded(11 + seed * 7);
  const gap = 38;
  const left = cx - 228;
  const top = cy - 171;
  const grid = [
    ...Array.from({ length: 13 }, (_, column) => `M${left + column * gap} ${top}v342`),
    ...Array.from({ length: 10 }, (_, row) => `M${left} ${top + row * gap}h456`),
  ].join("");
  const marks = Array.from({ length: 3 }, (_, index) => ({
    x: left + (2 + index * 3) * gap,
    y: top + (2 + Math.floor(next() * 5)) * gap,
  }));
  const guideX = left + (2 + seed % 3) * gap;
  return <>
    <path d={grid} className="journey-art-faint" />
    <path d={`M${guideX} ${top + gap}v${gap * 6}h${gap * 5}`} />
    <path d={`M${guideX + gap} ${top + gap * 3}h${gap * 3}v${gap * 2}`} className="journey-art-accent" />
    {marks.map(({ x, y }, index) => <path key={index} d={`M${x - 6} ${y}h12M${x} ${y - 6}v12`} className="journey-art-accent" />)}
  </>;
}

/** Hackathon: short routed connections with distinct terminal nodes. */
function Circuit({ cx, cy, seed }: Geometry) {
  const next = seeded(5 + seed * 13);
  const traces = Array.from({ length: 6 }, (_, index) => {
    const startX = cx + 235 - next() * 35;
    const startY = cy - 170 + index * 53;
    const bendX = startX - 65 - next() * 90;
    const drop = 28 + next() * 42;
    const endX = cx - 215 + next() * 100;
    const endY = startY + drop;
    return { d: `M${n(startX)} ${n(startY)}H${n(bendX)}L${n(bendX - drop)} ${n(endY)}H${n(endX)}`, endX, endY };
  });
  return <>
    {traces.map((trace, index) => <path key={index} d={trace.d} className={index === seed % 6 ? "journey-art-accent" : undefined} />)}
    {traces.map((trace, index) => <circle key={index} cx={n(trace.endX)} cy={n(trace.endY)} r="4" className={`journey-art-node${index === seed % 6 ? " journey-art-node--gold" : ""}`} />)}
  </>;
}

/** 3MT: a compact stopwatch and six quiet arcs carrying its voice outward. */
function Waves({ cx, cy, seed }: Geometry) {
  const x = cx + 90;
  const y = cy - 60;
  const arc = (radius: number, from: number, to: number) => {
    const [a, b] = [from * Math.PI / 180, to * Math.PI / 180];
    return `M${n(x + Math.cos(a) * radius)} ${n(y + Math.sin(a) * radius)}A${radius} ${radius} 0 0 1 ${n(x + Math.cos(b) * radius)} ${n(y + Math.sin(b) * radius)}`;
  };
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    const inner = index % 3 === 0 ? 33 : 37;
    return `M${n(x + Math.cos(angle) * inner)} ${n(y + Math.sin(angle) * inner)}L${n(x + Math.cos(angle) * 42)} ${n(y + Math.sin(angle) * 42)}`;
  });
  return <>
    <circle cx={x} cy={y} r="48" />
    <path d={`${ticks.join("")}M${x} ${y}v-26M${x - 8} ${y - 60}h16M${x} ${y - 60}v12M${x + 36} ${y - 35}l8-8`} />
    <path d={arc(54, -90, 0)} className="journey-art-accent" />
    {Array.from({ length: 6 }, (_, index) => <path key={index} d={arc(90 + index * 34, 85 + seed % 4 - index * 2, 180 + index * 3)} className={index % 3 === 0 ? undefined : "journey-art-faint"} />)}
    <circle cx={x} cy={y} r="3" className="journey-art-dot journey-art-dot--gold" />
  </>;
}

// The shape is composed before placement: an open study, a tall crop, a shallow
// fragment and an offset island. Seeds keep the repeats related, never identical.
const compositions = [
  { viewBox: "0 0 640 520", cx: 320, cy: 260, turn: -5 },
  { viewBox: "95 0 450 600", cx: 305, cy: 285, turn: 10 },
  { viewBox: "0 65 640 390", cx: 340, cy: 250, turn: -12 },
  { viewBox: "45 0 550 580", cx: 315, cy: 265, turn: 6 },
] as const;

export function JourneyArtwork({ motif, variant = 0, className = "" }: {
  motif: JourneyArtworkMotif;
  variant?: number;
  className?: string;
}) {
  const seed = Math.abs(Math.trunc(variant));
  const composition = compositions[seed % compositions.length];
  const props = { cx: composition.cx, cy: composition.cy, seed };
  return <svg className={`journey-art journey-art--${motif}${className ? ` ${className}` : ""}`} viewBox={composition.viewBox} preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true" focusable="false">
    <g transform={`rotate(${composition.turn} ${composition.cx} ${composition.cy})`}>
      {motif === "registration" ? <Contours {...props} />
        : motif === "submissions" ? <Scatter {...props} />
        : motif === "workshops" ? <Lattice {...props} />
        : motif === "hackathon" ? <Circuit {...props} />
        : <Waves {...props} />}
    </g>
  </svg>;
}
