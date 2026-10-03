import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className = "",
  inverse = false,
  chapter = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
  inverse?: boolean;
  /** A homepage chapter with a once-only phone arrival. */
  chapter?: boolean;
}) {
  const staged = chapter && typeof title === "string";
  const heading = (
    <div className={`section-heading${inverse ? " section-heading--inverse" : ""} ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {description ? <p className="section-heading-description">{description}</p> : null}
    </div>
  );
  return staged ? <div className="chapter-stage">{heading}</div> : heading;
}
