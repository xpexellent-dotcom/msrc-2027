import type { ReactNode } from "react";

/** One span per word, so a chapter title can settle word by word (ORG-010). */
function titleWords(title: string) {
  return title.split("\n").flatMap((line, row) => [
    ...(row ? ["\n"] : []),
    ...line.split(" ").flatMap((word, index) => [...(index ? [" "] : []), <span className="title-word" key={`${row}-${index}`}>{word}</span>]),
  ]);
}

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
  /** A homepage chapter: its title is staged for the phone title transition (chapter-titles.tsx). */
  chapter?: boolean;
}) {
  const staged = chapter && typeof title === "string";
  const heading = (
    <div className={`section-heading${inverse ? " section-heading--inverse" : ""} ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{eyebrow}</p> : null}
      {/* The label keeps the title one phrase for screen readers while its words move. */}
      <h2 id={id} aria-label={staged ? title.replace(/\s+/g, " ") : undefined}>{staged ? <span aria-hidden="true">{titleWords(title)}</span> : title}</h2>
      {description ? <p className="section-heading-description">{description}</p> : null}
    </div>
  );
  return staged ? <div className="chapter-stage">{heading}</div> : heading;
}
