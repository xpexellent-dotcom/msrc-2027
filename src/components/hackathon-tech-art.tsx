import { useId } from "react";

/**
 * Hackathon technology studies: glass orbs, circuit traces ending in ring nodes,
 * dot grids and a chevron stack, in the MSRC violet and gold. Static and decorative.
 * The hero draws the full composition on the dark violet hero; the field and closing
 * variants reuse it as quieter backgrounds on light sections.
 */
export function HackathonTechArt({ variant = "hero" }: { variant?: "hero" | "field" | "closing" }) {
  const id = useId().replace(/:/g, "");
  const turn = variant === "field" ? -18 : variant === "closing" ? 24 : 0;
  const dots = Array.from({ length: 63 }, (_, index) => [24 + index % 7 * 17, 70 + Math.floor(index / 7) * 17] as const);
  return <div className={`hackathon-tech-art hackathon-tech-art--${variant}`} aria-hidden="true">
    <svg className="hackathon-tech-svg" viewBox="-30 -24 630 528" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ stopColor: "var(--tech-glow, #9b6bff)", stopOpacity: .55 }} />
          <stop offset=".55" style={{ stopColor: "var(--tech-glow, #9b6bff)", stopOpacity: .16 }} />
          <stop offset="1" style={{ stopColor: "var(--tech-glow, #9b6bff)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--tech-glass, #ffffff)", stopOpacity: .26 }} />
          <stop offset=".6" style={{ stopColor: "var(--tech-glass, #ffffff)", stopOpacity: .07 }} />
          <stop offset="1" style={{ stopColor: "var(--tech-glass, #ffffff)", stopOpacity: .02 }} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--tech-line, #ffffff)", stopOpacity: .7 }} />
          <stop offset="1" style={{ stopColor: "var(--tech-line, #ffffff)", stopOpacity: .05 }} />
        </linearGradient>
      </defs>
      <g transform={`rotate(${turn} 280 240)`}>
        {/* Neon bloom behind the main orb. */}
        <circle cx="365" cy="246" r="250" fill={`url(#${id}-glow)`} stroke="none" />
        {/* A second, larger glass orb behind the copy side, then the main orb. */}
        <circle className="hackathon-tech-orb" cx="120" cy="300" r="170" fill={`url(#${id}-glass)`} stroke="none" opacity=".55" />
        <circle className="hackathon-tech-orb" cx="365" cy="246" r="172" fill={`url(#${id}-glass)`} stroke={`url(#${id}-rim)`} />
        <g className="hackathon-tech-orbits">
          {[200, 228].map((radius) => <circle key={radius} cx="365" cy="246" r={radius} />)}
        </g>
        <path className="hackathon-tech-gold hackathon-tech-arc" d="M365 74a172 172 0 0 1 134 64" />
        {/* Circuit traces that end in ring nodes. */}
        <path className="hackathon-tech-route" d="M-30 452H140l38-38h146M18 155h98l54-54h92M338 432v-57l41-41h170" />
        <path className="hackathon-tech-gold" d="M-30 284H115l45-45h86" />
        <g className="hackathon-tech-nodes">
          <circle cx="262" cy="101" r="9" />
          <circle cx="324" cy="414" r="7" />
          <circle cx="549" cy="334" r="6" />
          <circle className="hackathon-tech-gold" cx="252" cy="239" r="9" />
        </g>
        {/* Dot grid, a short dot row and a chevron stack. */}
        <g className="hackathon-tech-points">
          {dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />)}
        </g>
        <g className="hackathon-tech-row">
          {[0, 1, 2, 3, 4, 5].map((index) => <circle key={index} cx={430 + index * 18} cy="34" r="3" />)}
        </g>
        <g className="hackathon-tech-chevrons">
          {[0, 1, 2, 3, 4].map((index) => <path key={index} d={`M${170 + index * 9} ${300 + index * 9}h46v46`} />)}
        </g>
      </g>
    </svg>
  </div>;
}
