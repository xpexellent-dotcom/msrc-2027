/**
 * Quiet, one-sided artwork for the participation pages. Each journey has its own
 * motif, anchored to one corner of a section and masked out before the reading
 * column. Geometry comes from fixed constants and a seeded generator, so server
 * and client render identical markup.
 */
export type JourneyArtworkMotif = "registration" | "submissions" | "workshops" | "hackathon" | "threeMinuteThesis";
type Placement = "top" | "bottom";
/** lg anchors a section; md and sm are quieter echoes in other empty corners. */
type Size = "lg" | "md" | "sm";

const VIEW = 640;
// Motifs are drawn from the top corner; the bottom placement mirrors them vertically.
const [cx, cy] = [560, 70];

// Small deterministic generator (mulberry32).
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (value: number) => value.toFixed(1);

/** Attend: topographic contours, "mapping new ground". */
function Contours({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  const ring = (radius: number, index: number) => {
    const steps = 48;
    const points = Array.from({ length: steps }, (_, step) => {
      const angle = (step / steps) * Math.PI * 2;
      const wobble = 1 + .075 * Math.sin(3 * angle + index * .55 + seed) + .045 * Math.sin(5 * angle - index * .35 + seed * 2) + .02 * Math.sin(9 * angle + index);
      return [cx + Math.cos(angle) * radius * wobble, cy + Math.sin(angle) * radius * wobble * .82] as const;
    });
    const at = (step: number) => points[(step + steps) % steps];
    let d = `M${n(at(0)[0])} ${n(at(0)[1])}`;
    for (let step = 0; step < steps; step++) {
      const [p0, p1, p2, p3] = [at(step - 1), at(step), at(step + 1), at(step + 2)];
      d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
    }
    return `${d}Z`;
  };
  return <>
    {Array.from({ length: 11 }, (_, index) => <path key={index} d={ring(34 + index * 30, index)} className={index === 4 ? "journey-art-accent" : undefined} />)}
    <circle cx={cx} cy={cy} r="3" className="journey-art-dot journey-art-dot--gold" />
  </>;
}

/** Abstract submission: findings as a scatter of data rising along a fitted curve. */
function Scatter({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  const next = random(2027 + seed * 31);
  const curve = (t: number) => [cx - 470 * (1 - t), cy + 380 * Math.pow(1 - t, 1.6)] as const;
  const dots = Array.from({ length: 70 }, (_, index) => {
    const t = next();
    const [x, y] = curve(t);
    const spread = 18 + 70 * (1 - t);
    return { x: x + (next() - .5) * spread * .6, y: y + (next() - .5) * spread, r: 1.4 + next() * 1.6, gold: index % 17 === 0 };
  });
  const line = Array.from({ length: 25 }, (_, index) => curve(index / 24));
  return <>
    {[0, 1, 2, 3].map((index) => <path key={index} d={`M${cx - 480} ${n(cy + 40 + index * 95)}H${cx + 80}`} className="journey-art-faint" />)}
    <path d={`M${line.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}`} className="journey-art-accent" />
    {dots.map((dot, index) => <circle key={index} cx={n(dot.x)} cy={n(dot.y)} r={n(dot.r)} className={`journey-art-dot${dot.gold ? " journey-art-dot--gold" : ""}`} />)}
  </>;
}

/** Workshops: a cutting-mat grid, a few cells marked as if mid-task. */
function Lattice({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  const gap = 34;
  const marks: string[] = [];
  const pick = random(11 + seed);
  const marked = new Set(Array.from({ length: 4 }, () => `${1 + Math.floor(pick() * 7)},${1 + Math.floor(pick() * 6)}`));
  const filled: { x: number; y: number }[] = [];
  for (let row = 0; row < 9; row++) for (let column = 0; column < 15; column++) {
    const x = cx + 60 - column * gap; const y = cy - 40 + row * gap;
    if (Math.hypot(cx - x, cy - y) > 380) continue;
    marks.push(`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`);
    if (marked.has(`${column},${row}`)) filled.push({ x, y });
  }
  return <>
    <path d={marks.join("")} />
    <rect x={cx - 3 * gap - 17} y={cy - 40 + 2 * gap - 17} width={3 * gap} height={2 * gap} rx="6" className="journey-art-accent" />
    {filled.map(({ x, y }) => <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" transform={`rotate(45 ${x} ${y})`} className="journey-art-dot journey-art-dot--gold" />)}
  </>;
}

/** Hackathon: traces leaving the corner and ending in nodes, an idea being wired up. */
function Circuit({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  const next = random(5 + seed * 13);
  const traces = Array.from({ length: 7 }, (_, index) => {
    const startY = cy - 40 + index * 30;
    const run = 60 + next() * 120;
    const drop = 30 + next() * 90;
    const tail = 40 + next() * 140;
    const x1 = cx + 80 - run; const x2 = x1 - drop; const y2 = startY + drop;
    return { d: `M${cx + 80} ${startY}H${n(x1)}L${n(x2)} ${n(y2)}H${n(x2 - tail)}`, end: [x2 - tail, y2] as const, gold: index === 3 };
  });
  return <>
    {traces.map((trace, index) => <path key={index} d={trace.d} className={trace.gold ? "journey-art-accent" : undefined} />)}
    {traces.map((trace, index) => <circle key={index} cx={n(trace.end[0])} cy={n(trace.end[1])} r="4" className={trace.gold ? "journey-art-node journey-art-node--gold" : "journey-art-node"} />)}
  </>;
}

/** 3MT: a voice carrying outwards from a small three-minute dial. */
function Waves({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  const arc = (radius: number, from: number, to: number) => {
    const [a, b] = [from * Math.PI / 180, to * Math.PI / 180];
    return `M${n(cx + Math.cos(a) * radius)} ${n(cy + Math.sin(a) * radius)}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${n(cx + Math.cos(b) * radius)} ${n(cy + Math.sin(b) * radius)}`;
  };
  const ticks = Array.from({ length: 36 }, (_, index) => {
    const angle = (index / 36) * Math.PI * 2;
    const [inner, outer] = index % 3 === 0 ? [30, 38] : [33, 38];
    return `M${n(cx + Math.cos(angle) * inner)} ${n(cy + Math.sin(angle) * inner)}L${n(cx + Math.cos(angle) * outer)} ${n(cy + Math.sin(angle) * outer)}`;
  });
  return <>
    <path d={ticks.join("")} />
    {/* Three of the dial's twelve sectors: the three minutes. */}
    <path d={arc(46, -90, 0)} className="journey-art-accent" />
    {Array.from({ length: 9 - seed }, (_, index) => <path key={index} d={arc(80 + index * 34, 92 - index * 1.5, 178 + index * 1.5)} className={index % 4 === (1 + seed) % 4 ? undefined : "journey-art-faint"} />)}
    <circle cx={cx} cy={cy} r="3" className="journey-art-dot journey-art-dot--gold" />
  </>;
}

// Each variant re-seeds and turns its motif slightly, so repeats never look stamped.
const turns = [0, -14, 10, -6];

export function JourneyArtwork({ motif, placement, size = "lg", variant = 0 }: { motif: JourneyArtworkMotif; placement: Placement; size?: Size; variant?: number }) {
  const props = { cx, cy, seed: variant };
  const turn = turns[variant % turns.length];
  return (
    <svg className={`journey-art journey-art--${placement} journey-art--${size} journey-art--${motif}`} viewBox={`0 0 ${VIEW} ${VIEW}`} fill="none" aria-hidden="true" focusable="false">
      <g transform={placement === "bottom" ? `translate(0 ${VIEW}) scale(1 -1)` : undefined}>
        <g transform={turn ? `rotate(${turn} ${cx} ${cy})` : undefined}>
          {motif === "registration" ? <Contours {...props} seed={.4 + variant * 1.7} />
            : motif === "submissions" ? <Scatter {...props} />
            : motif === "workshops" ? <Lattice {...props} />
            : motif === "hackathon" ? <Circuit {...props} />
            : <Waves {...props} />}
        </g>
      </g>
    </svg>
  );
}
