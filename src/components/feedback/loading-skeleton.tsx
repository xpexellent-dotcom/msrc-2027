export function LoadingSkeleton({ label, lines = 3, className = "" }: {
  label: string;
  lines?: number;
  className?: string;
}) {
  const lineCount = Number.isFinite(lines) ? Math.min(8, Math.max(1, Math.floor(lines))) : 3;

  return (
    <div className={`loading-skeleton ${className}`.trim()}>
      <span role="status" className="sr-only">{label}</span>
      <div className="loading-skeleton-lines" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => <span key={index} className="loading-skeleton-line" />)}
      </div>
    </div>
  );
}
