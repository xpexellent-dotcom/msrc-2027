import type { ComponentPropsWithoutRef } from "react";

/** Supply aria-labelledby for a named editorial section. */
export function Section({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return <section {...props} className={`site-section ${className}`.trim()} />;
}
