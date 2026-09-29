import type { ReactNode } from "react";

type StatBlockProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
};

/** No inferred totals: display only the value and provenance supplied by the caller. */
export function StatBlock({ label, value, description }: StatBlockProps) {
  return (
    <div className="stat-block">
      <dl>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </dl>
      {description ? <p className="stat-block__description">{description}</p> : null}
    </div>
  );
}
