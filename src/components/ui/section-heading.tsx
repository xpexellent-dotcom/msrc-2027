import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className = "",
  inverse = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div className={`section-heading${inverse ? " section-heading--inverse" : ""} ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {description ? <p className="section-heading-description">{description}</p> : null}
    </div>
  );
}
