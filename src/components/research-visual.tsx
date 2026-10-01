/** Original decorative line art; no chart, statistic or conference asset is implied. */
export function ResearchVisual({ variant = 0, className = "" }: { variant?: number; className?: string }) {
  return (
    <svg className={`research-visual ${className}`} aria-hidden="true" focusable="false" viewBox="0 0 480 360" fill="none">
      {variant % 3 === 0 ? <>
        <circle cx="240" cy="180" r="132" className="visual-outline" />
        <ellipse cx="240" cy="180" rx="132" ry="54" transform="rotate(-35 240 180)" className="visual-outline" />
        <ellipse cx="240" cy="180" rx="132" ry="54" transform="rotate(35 240 180)" className="visual-outline" />
        <path d="M68 180h344M240 16v328" className="visual-guide" />
        <circle cx="240" cy="180" r="34" className="visual-core" />
        <circle cx="346" cy="101" r="12" className="visual-gold" />
        <circle cx="113" cy="215" r="8" className="visual-core" />
      </> : variant % 3 === 1 ? <>
        <path d="m101 205 86-95 107 28 87 119-164 47-116-99Zm0 0 193-67-77 166m-30-194 30 194 164-47-194-147" className="visual-outline" />
        {[[101,205],[187,110],[294,138],[381,257],[217,304]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r={index === 2 ? 20 : 12} className={index === 2 ? "visual-gold" : "visual-core"} />)}
        <circle cx="240" cy="180" r="150" className="visual-guide" />
      </> : <>
        {[0,1,2,3,4].map((index) => <path key={index} d={`M40 ${128 + index * 26}c70 0 75-84 145-84s85 168 155 168 70-84 100-84`} className="visual-outline" />)}
        <path d="M40 308h400M240 30v290" className="visual-guide" />
        <circle cx="240" cy="180" r="16" className="visual-gold" />
      </>}
    </svg>
  );
}
