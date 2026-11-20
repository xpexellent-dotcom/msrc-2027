import { Sparkle } from "@/components/brand/sparkle";

/** Anonymous linework; no photograph, personal identity or roster claim. */
export function PortraitPlaceholder({ variant = 0, className = "" }: { variant?: number; className?: string }) {
  const angle = [-18, 12, 35][variant % 3];
  return <div className={`portrait-placeholder portrait-placeholder--${variant % 3} ${className}`.trim()} aria-hidden="true">
    <span className="portrait-placeholder-mark" lang="en" dir="ltr">MSRC<span>2027</span></span>
    <svg className="portrait-placeholder-drawing" viewBox="0 0 400 500" fill="none" focusable="false">
      <g stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke">
        <ellipse cx="200" cy="225" rx="58" ry="73" />
        <path d="M145 207c-5-71 111-85 115 3M173 289v35m54-35v35M69 500v-63c0-71 47-113 104-113l27 29 27-29c57 0 104 42 104 113v63M140 346l60 85 60-85" />
        <ellipse cx="200" cy="281" rx="177" ry="114" transform={`rotate(${angle} 200 281)`} opacity=".6" />
      </g>
    </svg>
    <Sparkle className="portrait-placeholder-sparkle" size={20} />
  </div>;
}
