/** Navigation follows the reading direction; playback glyphs never mirror. */
export function Arrow({ className = "" }: { className?: string }) {
  return <svg className={`directional-arrow ${className}`.trim()} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

export function PlayGlyph() {
  return <svg className="play-glyph" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="m4 2 9 6-9 6V2Z" /></svg>;
}
