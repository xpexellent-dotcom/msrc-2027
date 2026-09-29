import type { ReactNode } from "react";

type ProgramRowProps = {
  time: ReactNode;
  dateTime?: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  scientific?: boolean;
  headingLevel?: "h2" | "h3" | "h4";
};

export function ProgramRow({
  time,
  dateTime,
  title,
  meta,
  children,
  scientific = false,
  headingLevel: Heading = "h3",
}: ProgramRowProps) {
  return (
    <article className="schedule-row">
      <div className="schedule-row__time">
        {dateTime ? <time dateTime={dateTime}>{time}</time> : time}
      </div>
      <div className="schedule-row__content" dir={scientific ? "ltr" : undefined} lang={scientific ? "en" : undefined}>
        <Heading>{title}</Heading>
        {meta ? <p className="schedule-row__meta">{meta}</p> : null}
        {children ? <div className="schedule-row__description">{children}</div> : null}
      </div>
    </article>
  );
}
