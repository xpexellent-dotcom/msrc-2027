/** Original flowing-line artwork derived from the brand's quiet wave motif; never a logo. */
export function FlowLines({ className = "" }: { className?: string }) {
  return <svg className={`flow-lines ${className}`} viewBox="0 0 640 640" fill="none" aria-hidden="true" focusable="false">
    {Array.from({ length: 12 }, (_, index) => <path key={index}
      d={`M${-180 + index * 17} -40C${440 + index * 8} 10 ${-170 + index * 25} 390 ${275 + index * 16} 640C${440 + index * 13} 750 ${600 + index * 15} 640 780 570`}
      stroke="currentColor" strokeWidth="1" />)}
  </svg>;
}
