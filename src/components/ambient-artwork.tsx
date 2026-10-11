import { Reveal } from "@/components/ui/reveal";

/** Geometric linework; a brief arrival settles into a static reading surface. */
export function AmbientArtwork({ variant = "paths" }: { variant?: "paths" | "benefits" | "people" }) {
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
