import type { ReactNode } from "react";

type ContentSplitProps = {
  children: ReactNode;
  aside: ReactNode;
  reverse?: boolean;
  className?: string;
};

export function ContentSplit({ children, aside, reverse = false, className = "" }: ContentSplitProps) {
  const content = <div className="content-split__main">{children}</div>;
  const secondary = <div className="content-split__aside">{aside}</div>;

  return (
    <div className={`content-split${reverse ? " content-split--reverse" : ""} ${className}`.trim()}>
      {reverse ? <>{secondary}{content}</> : <>{content}{secondary}</>}
    </div>
  );
}
