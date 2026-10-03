import type { CSSProperties, ReactNode } from "react";

/** One span per word, numbered, so a chapter title can light up word by word as it scrolls in (ORG-012). */
function titleWords(title: string) {
  let index = 0;
  return title.split("\n").flatMap((line, row) => [
    ...(row ? ["\n"] : []),
    ...line.split(" ").flatMap((word, column) => [
      ...(column ? [" "] : []),
      <span className="title-word" key={`${row}-${column}`} style={{ "--i": index++ } as CSSProperties}>{word}</span>,
    ]),
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
  /** A homepage chapter: its title follows the reader's scroll (scroll-scenes.tsx). */
  chapter?: boolean;
}) {
  const staged = chapter && typeof title === "string";
  const words = staged ? title.split(/\s+/).length : 0;
  const heading = (
    <div className={`section-heading${inverse ? " section-heading--inverse" : ""} ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{eyebrow}</p> : null}
      {/* The label keeps the title one phrase for screen readers while its words light up. */}
      <h2 id={id} aria-label={staged ? title.replace(/\s+/g, " ") : undefined} style={staged ? { "--n": words } as CSSProperties : undefined}>
        {staged ? <span aria-hidden="true">{titleWords(title)}</span> : title}
      </h2>
      {description ? <p className="section-heading-description">{description}</p> : null}
    </div>
  );
  return staged ? <div className="chapter-stage">{heading}</div> : heading;
}
