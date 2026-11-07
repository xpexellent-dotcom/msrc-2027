import { Reveal } from "@/components/ui/reveal";

/** Geometric linework; a brief arrival settles into a static reading surface. */
export function AmbientArtwork({ variant = "paths", figure = "paths" }: { variant?: "paths" | "benefits" | "people" | "flow"; figure?: "paths" | "program" | "people" | "venue" }) {
  if (variant === "flow") {
    const lines = {
      paths: ["M-120 900C200 960 340 180 720 220S1000 740 1340 320", "M690 221C735 220 780 232 820 253"],
      program: ["M-120 300C250 20 290 650 700 600S980 100 1320 280", "M665 600C710 602 750 596 790 583"],
      people: ["M-100 760C260 1030 350 130 750 320S1040 1060 1320 650", "M730 310C765 325 800 349 829 377"],
      venue: ["M-140 980C350 920 240 230 670 180S1100 340 1340 40", "M638 185C676 179 718 179 757 183"],
    } as const;
    return <Reveal className="ambient-art ambient-art--flow" data-figure={figure} aria-hidden="true">
      <svg className="ambient-flow" viewBox="0 0 1200 1100" fill="none" preserveAspectRatio="xMidYMid slice" focusable="false">
        <path d={lines[figure][0]} pathLength="1" vectorEffect="non-scaling-stroke" strokeWidth="1.25" />
        <path className="ambient-flow-gold" d={lines[figure][1]} pathLength="1" vectorEffect="non-scaling-stroke" strokeWidth="1.25" />
      </svg>
    </Reveal>;
  }
  return <Reveal className={`ambient-art ambient-art--${variant}`} aria-hidden="true">
    <svg viewBox="0 0 1200 1100" fill="none" preserveAspectRatio="xMidYMid slice">
      <g className="ambient-ribbon">
        {Array.from({ length: 12 }, (_, index) => <path key={index} d={`M ${-260 + index * 23} 1180 C ${20 + index * 30} 580, ${990 - index * 25} 1040, ${730 + index * 20} 420 S ${200 + index * 35} 40, ${700 + index * 30} -150`} />)}
      </g>
      <g className="ambient-orbit">
        {[0, 1, 2].map(index => <ellipse key={index} cx="940" cy="190" rx={160 + index * 50} ry={100 + index * 35} transform="rotate(-35 940 190)" />)}
      </g>
    </svg>
  </Reveal>;
}
