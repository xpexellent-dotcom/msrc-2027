/** An anonymous portrait treatment: no photograph, personal identity or roster claim. */
export function PortraitPlaceholder({ variant = 0, className = "" }: { variant?: number; className?: string }) {
  return <div className={`portrait-placeholder portrait-placeholder--${variant % 3} ${className}`.trim()} aria-hidden="true">
    <span className="portrait-placeholder-mark" lang="en" dir="ltr">MSRC<span>2027</span></span>
    <span className="portrait-placeholder-head" />
    <span className="portrait-placeholder-shoulders" />
    <span className="portrait-placeholder-frame" />
  </div>;
}
