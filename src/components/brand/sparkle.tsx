/** ORG-072: one restrained brand accent; decorative throughout. */
export function Sparkle({ size = 12, className = "" }: { size?: number; className?: string }) {
  return <svg className={`sparkle ${className}`.trim()} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"><path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" fill="currentColor" /></svg>;
}
