/** ORG-072: light, static SVG bookend; no raster ribbon or animation. */
export function FlowRibbon({ edge = "bottom" }: { edge?: "top" | "bottom" }) {
  return <svg className={`flow-ribbon flow-ribbon--${edge}`} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M0 160V70C260 30 560 20 860 58S1270 120 1440 80V160Z" fill="var(--color-purple)" />
    <path d="M0 160V98C300 60 600 52 900 84S1290 140 1440 110V160Z" fill="var(--color-violet)" />
    <path d="M0 160V124C320 92 640 88 940 110S1300 156 1440 134V160Z" fill="var(--color-mauve)" fillOpacity=".9" />
    <path className="flow-ribbon-end" d="M0 160V146C360 126 700 124 1000 138S1340 160 1440 152V160Z" fill="var(--ribbon-end)" />
    <path d="M0 124C320 92 640 88 940 110S1300 156 1440 134" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
  </svg>;
}
