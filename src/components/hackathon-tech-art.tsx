/** Three quiet compositions share one static circuit drawing across the journey. */
export function HackathonTechArt({ variant = "hero" }: { variant?: "hero" | "field" | "closing" }) {
  const turn = variant === "field" ? -18 : variant === "closing" ? 24 : 0;
  return <div className={`hackathon-tech-art hackathon-tech-art--${variant}`} aria-hidden="true">
    <svg className="hackathon-tech-svg" viewBox="-30 -24 630 528" fill="none" aria-hidden="true" focusable="false">
      <g transform={`rotate(${turn} 280 240)`}>
      <circle className="hackathon-tech-disc" cx="365" cy="246" r="174" />
      <g className="hackathon-tech-orbits">
        {[138, 166, 195].map((radius) => <circle key={radius} cx="365" cy="246" r={radius} />)}
      </g>
      <path className="hackathon-tech-route" d="M18 155h98l54-54h92M54 389h105l48-48h82M338 432v-57l41-41h153" />
      <path className="hackathon-tech-gold" d="M16 284h99l45-45h90" />
      <path className="hackathon-tech-gold hackathon-tech-arc" d="M365 70a176 176 0 0 1 124 51" />
      <g className="hackathon-tech-nodes">
        <circle cx="262" cy="101" r="5" />
        <circle cx="289" cy="341" r="5" />
        <circle cx="338" cy="432" r="4" />
        <circle className="hackathon-tech-gold" cx="250" cy="239" r="7" />
      </g>
      <g className="hackathon-tech-points">
        {Array.from({ length: 20 }, (_, index) => <circle key={index} cx={407 + index % 5 * 21} cy={27 + Math.floor(index / 5) * 21} r="1.5" />)}
      </g>
      </g>
    </svg>
  </div>;
}
