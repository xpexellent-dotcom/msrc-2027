/** One static circuit study, contained in the hero's otherwise empty grid cell. */
export function HackathonTechArt() {
  return <div className="hackathon-tech-art" aria-hidden="true">
    <svg className="hackathon-tech-svg" viewBox="0 0 560 480" fill="none" aria-hidden="true" focusable="false">
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
    </svg>
  </div>;
}
